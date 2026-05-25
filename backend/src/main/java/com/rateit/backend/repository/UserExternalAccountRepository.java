package com.rateit.backend.repository;

import com.rateit.backend.entity.UserExternalAccount;
import com.rateit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserExternalAccountRepository extends JpaRepository<UserExternalAccount, Long> {
    long countByUser(User user);
    void deleteByUser(User user);
}
