package com.rateit.backend.service;

import com.rateit.backend.entity.User;
import com.rateit.backend.entity.types.OtpChannel;
import com.rateit.backend.entity.types.UserRoles;
import com.rateit.backend.exception.BadRequestException;
import com.rateit.backend.service.otp.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String TEST_USER_VERIFICATION_CODE = "000000";

    private final OtpService otpService;
    private final UserService userService;

    public void sendOtp(String phoneNumber) {
        if (!isTestUser(phoneNumber)) {
            otpService.sendOtp(phoneNumber, OtpChannel.SMS);
        }
    }

    public List<String> authenticate(String phoneNumber, String code) {
        Optional<User> user = userService.findByPhoneNumberIncludingDeleted(phoneNumber);
        if (user.isPresent() && user.get().getDeletedAt() != null) {
            throw BadRequestException.invalidRequest("This account has been deleted");
        }

        validateCode(phoneNumber, code, user);
        return buildAuthorities(user);
    }

    private void validateCode(String phoneNumber, String code, Optional<User> user) {
        if (isTestUser(user)) {
            if (!TEST_USER_VERIFICATION_CODE.equals(code)) {
                throw BadRequestException.invalidRequest("Test accounts must use verification code 000000");
            }
            return;
        }

        otpService.verifyOtp(phoneNumber, code);
    }

    private List<String> buildAuthorities(Optional<User> user) {
        List<String> authorities = new ArrayList<>(List.of(UserRoles.USER));

        user.ifPresent(currentUser -> {
            String role = currentUser.getRole();
            if (role != null && !role.isBlank() && !UserRoles.USER.equals(role)) {
                authorities.add(role);
            }
        });

        return authorities;
    }

    private boolean isTestUser(String phoneNumber) {
        return isTestUser(userService.findByPhoneNumberIncludingDeleted(phoneNumber));
    }

    private boolean isTestUser(Optional<User> user) {
        return user.map(User::getRole)
            .map(UserRoles::isTestUser)
            .orElse(false);
    }
}
